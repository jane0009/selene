import { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

// export const patches: Patch[] = [
//   {
//     find: '"USER_SETTINGS",',
//     replace: {
//       match: '"USER_SETTINGS","User Settings"',
//       replacement: '"USER_SETTINGS","hacked by sampleExtension lol"'
//     }
//   }
// ];

interface Lock {
  locked: boolean;
  node: HTMLAudioElement;
}

interface DisabledKey {
  control?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string;
}

const typing: Lock[] = [
  {
    locked: false,
    node: new Audio(
      "https://gitdab.com/jane/osu-sounds/raw/branch/master/osu_typing_click1.wav"
    )
  },
  {
    locked: false,
    node: new Audio(
      "https://gitdab.com/jane/osu-sounds/raw/branch/master/osu_typing_click2.wav"
    )
  },
  {
    locked: false,
    node: new Audio(
      "https://gitdab.com/jane/osu-sounds/raw/branch/master/osu_typing_click3.wav"
    )
  }
];

const backspace: Lock = {
  locked: false,
  node: new Audio(
    "https://gitdab.com/jane/osu-sounds/raw/branch/master/osu_typing_erase.wav"
  )
};

let randomize =
  moonlight.getConfigOption<boolean>("osuTyping", "randomize") ?? true;

let noBubbling =
  moonlight.getConfigOption<boolean>("osuTyping", "noBubbling") ?? true;

let disabledKeys =
  moonlight.getConfigOption<string[]>("osuTyping", "disabledKeys") ?? [];

const keys: {
  [key: string]: boolean;
} = {};

const disabledKeyMap: {
  [key: string]: DisabledKey[];
} = {};

const play = (audio: Lock): void => {
  if (audio.node.paused && !audio.locked) {
    audio.locked = true;
    audio.node.currentTime = 0;
    audio.node.play().then(() => {
      audio.locked = false;
    });
  } else {
    let clone: HTMLAudioElement | null =
      audio.node.cloneNode() as HTMLAudioElement;
    clone.currentTime = 0;
    clone.play();
    clone.addEventListener(
      "ended",
      () => {
        if (clone) {
          clone.src = "";
          clone = null;
        }
      },
      {
        once: true
      }
    );
  }
};

const typeKeyUp = (ev: KeyboardEvent): void => {
  if (keys[ev.key]) {
    keys[ev.key] = false;
  }
};
const typeKeyDown = (ev: KeyboardEvent): void => {
  if (noBubbling && keys[ev.key]) {
    return;
  }
  keys[ev.key] = true;
  if (disabledKeyMap[ev.key]) {
    const dks = disabledKeyMap[ev.key];
    let disabled = false;
    for (const dk of dks) {
      if (
        (dk.control && !ev.ctrlKey) ||
        (dk.shift && !ev.shiftKey) ||
        (dk.alt && !ev.altKey)
      ) {
        disabled = true;
        break;
      }
    }
    if (disabled) {
      return;
    }
  }
  if (ev.key === "Backspace") {
    play(backspace);
  } else {
    const keysound = randomize ? typing[Math.floor(Math.random() * typing.length)] : typing[0];
    play(keysound);
  }
};

const setupKeyMap = (): void => {
  for (const key of disabledKeys) {
    const lc = key.toLowerCase();
    const ctrl = lc.includes("ctrl-");
    const shift = lc.includes("shift-");
    const alt = lc.includes("alt-");
    const keyName = lc.replace(/(ctrl-|shift-|alt-)/gi, "");
    disabledKeyMap[keyName] ??= [];
    disabledKeyMap[keyName].push({
      control: ctrl,
      shift: shift,
      alt: alt,
      key: keyName
    });
  }
};

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  entrypoint: {
    entrypoint: true,
    run: (module, exports, require) => {
      setupKeyMap();
      document.addEventListener("keyup", typeKeyUp);
      document.addEventListener("keydown", typeKeyDown);
    }
  }
};
