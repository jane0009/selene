import { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

let hardCrash =
  moonlight.getConfigOption<boolean>("crashMe", "hardCrash") ?? false;

export const patches: Patch[] = hardCrash
  ? [
      {
        find: "MessageContent",
        replace: {
          match: /(.)\|\|\((.)="function"/,
          replacement: 'throw new Error("a"); (0'
        }
      }
    ]
  : [];

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  entrypoint: {
    entrypoint: true,
    run: () => {
      if (!hardCrash) {
        throw new Error("a");
      }
    }
  }
};
