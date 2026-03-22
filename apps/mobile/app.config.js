const appJson = require("./app.json");

const androidPackage =
  process.env.EXPO_ANDROID_PACKAGE || "com.j0taaa.janvas";
const androidVersionCode = Number.parseInt(
  process.env.EXPO_ANDROID_VERSION_CODE || "1",
  10,
);

if (!Number.isInteger(androidVersionCode) || androidVersionCode < 1) {
  throw new Error("EXPO_ANDROID_VERSION_CODE must be a positive integer.");
}

module.exports = () => ({
  ...appJson.expo,
  android: {
    ...appJson.expo.android,
    package: androidPackage,
    versionCode: androidVersionCode,
  },
});
