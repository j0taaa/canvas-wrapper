const appJson = require("./app.json");

const androidPackage =
  process.env.EXPO_ANDROID_PACKAGE || "com.j0taaa.canvaswrapper";
const androidVersionCode = Number.parseInt(
  process.env.EXPO_ANDROID_VERSION_CODE || "2",
  10,
);
const iosBundleIdentifier =
  process.env.EXPO_IOS_BUNDLE_IDENTIFIER || "com.j0taaa.janvas";
const iosBuildNumberValue = Number.parseInt(
  process.env.EXPO_IOS_BUILD_NUMBER || "1",
  10,
);

if (!Number.isInteger(androidVersionCode) || androidVersionCode < 1) {
  throw new Error("EXPO_ANDROID_VERSION_CODE must be a positive integer.");
}

if (!iosBundleIdentifier) {
  throw new Error("EXPO_IOS_BUNDLE_IDENTIFIER must be a non-empty string.");
}

if (!Number.isInteger(iosBuildNumberValue) || iosBuildNumberValue < 1) {
  throw new Error("EXPO_IOS_BUILD_NUMBER must be a positive integer.");
}

module.exports = () => ({
  ...appJson.expo,
  ios: {
    ...appJson.expo.ios,
    buildNumber: String(iosBuildNumberValue),
    bundleIdentifier: iosBundleIdentifier,
  },
  android: {
    ...appJson.expo.android,
    package: androidPackage,
    versionCode: androidVersionCode,
  },
});
