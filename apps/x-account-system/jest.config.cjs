/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  // .ts import 文に拡張子を含む書き方 (TS NodeNext) を許可
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.ts$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        // import .ts 形式を許可するため tsconfig を緩める
        tsconfig: {
          target: "ES2022",
          module: "CommonJS",
          moduleResolution: "Node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          isolatedModules: false,
          verbatimModuleSyntax: false,
          strict: true,
          skipLibCheck: true,
          allowImportingTsExtensions: false,
        },
        diagnostics: false,
      },
    ],
  },
};
