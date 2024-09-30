import { ExtensionWebpackModule, Patch } from "@moonlight-mod/types";

const mappings = {
  ColorUtils: ["<=16777215", ", calc(var(--saturation-factor, 1) * "],
  ChannelStore: '"ChannelStore"',
  GuildMemberStore: '"GuildMemberStore"',
  murmur: ".murmur;",
  getDarkness: "1-(.299*(",
  hex2int: ").num()",
  hex2rgb: ".alpha()).css()",
  int2hex: '<=16777215?"#".concat',
  int2hsl: ", calc(var(--saturation-factor, 1) * ",
  int2hslRaw: "=Math.round(60*(",
  int2rgbArray: "return[",
  int2rgba: '"rgba(".concat(',
  isValidHex: "().valid(",
  rgb2int: ".red<<16)+("
};

const PASTEL_SATURATION = 75;
const PASTEL_VALUE = 60;

// we're going back in time to the first thanksgiving to get turkey off the menu
function int2hsv(e: number) {
  var t,
    n = ((e >> 16) & 255) / 255,
    r = ((e >> 8) & 255) / 255,
    i = (255 & e) / 255,
    a = Math.max(n, r, i),
    o = Math.min(n, r, i),
    s = a,
    u = a - o;
  t = 0 === a ? 0 : u / a;
  if (a === o) s = 0;
  else {
    switch (a) {
      case n:
        s = (r - i) / u + (r < i ? 6 : 0);
        break;
      case r:
        s = (i - n) / u + 2;
        break;
      case i:
        s = (n - r) / u + 4;
    }
    s *= 60;
  }
  return {
    h: s,
    s: t,
    v: a
  };
}

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  colorUtils: {
    dependencies: [{ ext: "spacepack", id: "spacepack" }],
    entrypoint: true,
    run: (module, exports, require) => {
      const spacepack = require("spacepack_spacepack").default;
      // find the modules
      const murmurhash = spacepack.findByCode(mappings.murmur)[0].exports;
      const ColorUtil = spacepack.findByCode(...mappings.ColorUtils)[0].exports;
      const cs = spacepack.findByCode(mappings.ChannelStore)[0].exports;
      const gms = spacepack.findByCode(mappings.GuildMemberStore)[0].exports;

      // extract the code
      const ChannelStore = spacepack.findObjectFromKey(cs, "getChannel");
      const GuildMemberStore = spacepack.findObjectFromKey(gms, "getMember");
      const hex2int = spacepack.findFunctionByStrings(
        ColorUtil,
        mappings.hex2int
      );
      const int2hsl = spacepack.findFunctionByStrings(
        ColorUtil,
        mappings.int2hsl
      );
      const isValidHex = spacepack.findFunctionByStrings(
        ColorUtil,
        mappings.isValidHex
      );

      // checking
      if (!ChannelStore) {
        console.error("Could not find ChannelStore");
        return;
      }
      if (!GuildMemberStore) {
        console.error("Could not find GuildMemberStore");
        return;
      }
      if (!hex2int) {
        console.error("could not find hex2int");
        return;
      }
      if (!int2hsl) {
        console.error("could not find int2hsl");
        return;
      }
      if (!isValidHex) {
        console.error("could not find isValidHex");
        return;
      }

      const colorize = moonlight.getConfigOption<string>("nameColor", "colorize") ?? "Uncolored";

      // actual module
      const nameColor: {
        int2hsv: Function;
        callbacks: Function[];
        addCallback: Function;
        getColor: Function;
        getRoleColor: Function;
        color2int: Function;
        int2rgb: Function;
        getReadableColorRGB: Function;
        getReadableColorRole: Function;
      } = {
        int2hsv,
        callbacks: [],
        addCallback(callback: Function) {
          nameColor.callbacks.push(callback);
        },
        getColor({
          userId,
          saturation = null,
          value = null
        }: {
          userId: string;
          saturation: number | null;
          value: number | null;
        }) {
          let out: string | null = null;

          if (colorize === "All" || colorize === "Uncolored") {
            const hue = murmurhash(userId) % 360;

            out = `hsl(${hue}, calc(var(--saturation-factor,1)*${
              saturation ?? PASTEL_SATURATION
            }%), ${value ?? PASTEL_VALUE}%)`;
          }

          for (const callback of nameColor.callbacks) {
            const result: string | null = callback({ userId });
            if (result != null) out = result;
          }

          return out;
        },
        getRoleColor({
          userId,
          channelId,
          guildId,
          messageId,
          saturation,
          value,
          saturate = true
        }: {
          userId: string;
          channelId: string | null;
          guildId: string | null;
          messageId: string | null;
          saturation: number | null;
          value: number | null;
          saturate: boolean;
        }) {
          let out: string | null = null;
          if (colorize === "All") {
            const hue = murmurhash(userId) % 360;
            out = saturate
              ? `hsl(${hue}, calc(var(--saturation-factor,1)*${
                  saturation ?? PASTEL_SATURATION
                }%), ${value ?? PASTEL_VALUE}%)`
              : `hsl(${hue}, ${saturation ?? PASTEL_SATURATION}%, ${
                  value ?? PASTEL_VALUE
                }%)`;
          } else {
            let guild: string | null = guildId;
            let dm = false;
            if (channelId != null) {
              const channel = ChannelStore.getChannel(channelId);
              guild = channel?.guild_id;
              dm = channel?.isDM() || channel?.isGroupDM() || false;
            }

            if (guild != null) {
              const member = GuildMemberStore.getMember(guild, userId);
              if (member) {
                if (member.colorString != null) {
                  if (saturation != null && value != null) {
                    const colorInt = hex2int(member.colorString);
                    const hue = int2hsv(colorInt).h;

                    out = saturate
                      ? `hsl(${hue}, calc(var(--saturation-factor,1)*${saturation}%), ${value}%)`
                      : `hsl(${hue}, ${saturation}%, ${value}%)`;
                  } else {
                    if (saturate) {
                      out = int2hsl(hex2int(member.colorString), true);
                    } else {
                      out = member.colorString;
                    }
                  }
                } else if (colorize === "Uncolored") {
                  const hue = murmurhash(userId) % 360;
                  out = `hsl(${hue}, calc(var(--saturation-factor,1)*${
                    saturation ?? PASTEL_SATURATION
                  }%), ${value ?? PASTEL_VALUE}%)`;
                }
              } else if (colorize === "Uncolored") {
                const hue = murmurhash(userId) % 360;
                out = `hsl(${hue}, calc(var(--saturation-factor,1)*${
                  saturation ?? PASTEL_SATURATION
                }%), ${value ?? PASTEL_VALUE}%)`;
              }
            }

            if (dm && colorize === "Uncolored") {
              const hue = murmurhash(userId) % 360;
              out = `hsl(${hue}, calc(var(--saturation-factor,1)*${
                saturation ?? PASTEL_SATURATION
              }%), ${value ?? PASTEL_VALUE}%)`;
            }
          }

          for (const callback of nameColor.callbacks) {
            const result: string | null = callback({ userId });
            if (result != null) out = result;
          }

          return out;
        },
        color2int(color: string | null) {
          if (color == null) return null;
          if (isValidHex(color)) {
            return hex2int(color);
          } else if (color.startsWith("hsl")) {
            const match = color.match(
              /hsla?\((\d+?),.*?((?!0\d)\d*(\.\d+)?)%.*?,.*?((?!0\d)\d*(\.\d+)?)%.*?\)/
            );
            if (!match) return null;
            let [h, s, l] = [match[1], match[2], match[4]];
            let hue = parseInt(h);
            let saturation = parseFloat(s) / 100;
            let lightness = parseFloat(l) / 100;

            const a = saturation * Math.min(lightness, 1 - lightness);
            const f = (n: number) => {
              const k = (n + hue / 30) % 12;
              const color =
                lightness - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
              return Math.round(255 * color)
                .toString(16)
                .padStart(2, "0");
            };

            return hex2int(`#${f(0)}${f(8)}${f(4)}`);
          }
          return null;
        },
        int2rgb(int: number) {
          return {
            r: (int >> 16) & 255,
            g: (int >> 8) & 255,
            b: 255 & int
          };
        },
        getReadableColorRGB(r: number, g: number, b: number) {
          return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "black" : "white";
        },
        getReadableColorRole({
          userId,
          channelId,
          guildId,
          saturation,
          value,
          saturate = true
        }: {
          userId: string;
          channelId: string | null;
          guildId: string | null;
          saturation: number | null;
          value: number | null;
          saturate: boolean;
        }) {
          const factor = parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              "--saturation-factor"
            )
          );

          let out: string | null = null;

          if (colorize === "All") {
            const hue = murmurhash(userId) % 360;
            const sat =
              (saturate ? factor : 1) * (saturation ?? PASTEL_SATURATION);
            const val = value ?? PASTEL_VALUE;

            const { r, g, b } = nameColor.int2rgb(
              nameColor.color2int(`hsl(${hue}, ${sat}%, ${val}%)`)
            );

            out = nameColor.getReadableColorRGB(r, g, b);
          } else {
            let guild: string | null = guildId;
            let dm = false;
            if (channelId != null) {
              const channel = ChannelStore.getChannel(channelId);
              guild = channel?.guild_id;
              dm = channel?.isDM() || channel?.isGroupDM() || false;
            }

            if (guild != null) {
              const member = GuildMemberStore.getMember(guild, userId);
              if (member) {
                if (member.colorString != null) {
                  if (saturation != null && value != null) {
                    const colorInt = hex2int(member.colorString);
                    const hue = int2hsv(colorInt).h;
                    const sat = (saturate ? factor : 1) * saturation;

                    const { r, g, b } = nameColor.int2rgb(
                      nameColor.color2int(`hsl(${hue}, ${sat}%, ${value}%)`)
                    );
                    out = nameColor.getReadableColorRGB(r, g, b);
                  } else {
                    const hsl = int2hsl(hex2int(member.colorString));

                    const match = hsl.match(
                      /hsla?\((\d+?),.*?((?!0\d)\d*(\.\d+)?)%.*?,.*?((?!0\d)\d*(\.\d+)?)%.*?\)/
                    );

                    if (!match) return null;
                    let [h, s, l] = [match[1], match[2], match[4]];

                    const hue = parseInt(h);
                    const saturation = parseFloat(s) * (saturate ? factor : 1);
                    const lightness = parseFloat(l);

                    const { r, g, b } = nameColor.int2rgb(
                      nameColor.color2int(
                        `hsl(${hue}, ${saturation}%, ${lightness}%)`
                      )
                    );
                    out = nameColor.getReadableColorRGB(r, g, b);
                  }
                } else if (colorize === "Uncolored") {
                  const hue = murmurhash(userId) % 360;
                  const sat =
                    (saturate ? factor : 1) * (saturation ?? PASTEL_SATURATION);
                  const val = value ?? PASTEL_VALUE;

                  const { r, g, b } = nameColor.int2rgb(
                    nameColor.color2int(`hsl(${hue}, ${sat}%, ${val}%)`)
                  );
                  out = nameColor.getReadableColorRGB(r, g, b);
                }
              } else if (colorize === "Uncolored") {
                const hue = murmurhash(userId) % 360;
                const sat =
                  (saturate ? factor : 1) * (saturation ?? PASTEL_SATURATION);
                const val = value ?? PASTEL_VALUE;

                const { r, g, b } = nameColor.int2rgb(
                  nameColor.color2int(`hsl(${hue}, ${sat}%, ${val}%)`)
                );
                out = nameColor.getReadableColorRGB(r, g, b);
              }
            }
          }
          return out;
        }
      };

      module.exports.default = module.exports.nameColor = nameColor;
    }
  }
};