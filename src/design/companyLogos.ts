export function resolveCompanyLogos(light?: string | null, dark?: string | null) {
  return {
    logoLightUrl: light || dark || "/glasscode-light.png",
    logoDarkUrl: dark || light || "/glasscode-dark.png",
  };
}
