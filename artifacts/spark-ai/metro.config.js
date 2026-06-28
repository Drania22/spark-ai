const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude @clerk/backend temp directories that get deleted during runtime
// and cause Metro's file watcher to crash with ENOENT errors.
const blockList = config.resolver?.blockList ?? [];
const blockListRegexes = Array.isArray(blockList) ? blockList : [blockList];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...blockListRegexes,
    /node_modules\/.pnpm\/@clerk\+backend[^/]*\/node_modules\/@clerk\/backend_tmp_.*/,
  ],
};

module.exports = config;
