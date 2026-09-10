export function ehAtalhoNovoOrcamento(event: {
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  repeat: boolean;
  isComposing: boolean;
}) {
  return event.shiftKey && !event.ctrlKey && !event.altKey && !event.metaKey
    && !event.repeat && !event.isComposing
    && (event.key === "+" || event.code === "NumpadAdd");
}
