const MOJIBAKE_MARKERS = ["Ã", "Â", "�"];

const seemsMojibake = (text: string) => MOJIBAKE_MARKERS.some((marker) => text.includes(marker));

const readFileAsArrayBuffer = (file: File) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (result instanceof ArrayBuffer) {
        resolve(result);
        return;
      }
      reject(new Error("Falha ao ler arquivo como ArrayBuffer."));
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsArrayBuffer(file);
  });

export const decodeCsvFile = async (file: File): Promise<string> => {
  const buffer = await readFileAsArrayBuffer(file);
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

  if (!seemsMojibake(utf8)) {
    return utf8;
  }

  const windows1252 = new TextDecoder("windows-1252", { fatal: false }).decode(buffer);
  if (!seemsMojibake(windows1252)) {
    return windows1252;
  }

  return windows1252;
};
