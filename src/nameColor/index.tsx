import { ExtensionWebpackModule } from "@moonlight-mod/types";

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

/**
 * JS Implementation of MurmurHash3 (r136) (as of May 20, 2011)
 * 
 * @author <a href="mailto:gary.court@gmail.com">Gary Court</a>
 * @see http://github.com/garycourt/murmurhash-js
 * @author <a href="mailto:aappleby@gmail.com">Austin Appleby</a>
 * @see http://sites.google.com/site/murmurhash/
 * 
 * @param {string} key ASCII only
 * @param {number} seed Positive integer only
 * @return {number} 32-bit positive integer hash 
 */

function murmurhash(key = "", seed = 1) {
	var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;
	
	remainder = key.length & 3; // key.length % 4
	bytes = key.length - remainder;
	h1 = seed;
	c1 = 0xcc9e2d51;
	c2 = 0x1b873593;
	i = 0;
	
	while (i < bytes) {
	  	k1 = 
	  	  ((key.charCodeAt(i) & 0xff)) |
	  	  ((key.charCodeAt(++i) & 0xff) << 8) |
	  	  ((key.charCodeAt(++i) & 0xff) << 16) |
	  	  ((key.charCodeAt(++i) & 0xff) << 24);
		++i;
		
		k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

		h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
		h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
		h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
	}
	
	k1 = 0;
	
	switch (remainder) {
		case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
		case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
		case 1: k1 ^= (key.charCodeAt(i) & 0xff);
		
		k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
		k1 = (k1 << 15) | (k1 >>> 17);
		k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
		h1 ^= k1;
	}
	
	h1 ^= key.length;

	h1 ^= h1 >>> 16;
	h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
	h1 ^= h1 >>> 13;
	h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
	h1 ^= h1 >>> 16;

	return h1 >>> 0;
}

export const webpackModules: Record<string, ExtensionWebpackModule> = {
  colorUtils: {
    dependencies: [
      { ext: "spacepack", id: "spacepack" },
      { id: "discord/utils/ColorUtils" }
    ],
    entrypoint: true,
    run: (module, exports, require) => {
      // find the modules
      const ColorUtil = require("discord/utils/ColorUtils");
      const ChannelStore = require("discord/stores/ChannelStore").default;
      const GuildMemberStore = require("discord/stores/GuildMemberStore").default;

      // console.log(murmurhash, ColorUtil, ChannelStore, GuildMemberStore);

      // extract the code
      const hex2int = ColorUtil.hex2int;
      const int2hsl = ColorUtil.int2hsl;
      const isValidHex = ColorUtil.isValidHex;

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

      const colorize =
        moonlight.getConfigOption<string>("nameColor", "colorize") ??
        "Uncolored";

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
