import { Patch } from "@moonlight-mod/types";

const pastelize = moonlight.getConfigOption<boolean>("roleColoredMessages", "pastelize") ?? false;

export const patches: Patch[] = [
  {
    find: ".SOURCE_MESSAGE_DELETED)",
    replace: {
      match: /"div",{id:/,
      replacement: `"div",{style:{color:require("nameColor_colorUtils").default.getRoleColor({messageId:arguments[0].message.id,channelId:arguments[0].message.channel_id,userId:arguments[0].message.author.id,saturation:${pastelize ? 85 : null},value:${pastelize ? 75 : null}})},id:`
    }
  }
]