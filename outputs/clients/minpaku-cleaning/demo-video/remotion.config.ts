import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
// recordings/full.webm を staticFile() で参照するため public dir を output に向ける
Config.setPublicDir("./output");
