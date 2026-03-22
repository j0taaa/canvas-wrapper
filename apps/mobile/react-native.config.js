const path = require("path");

function resolvePackagePath(packageName, relativePath = "") {
  const packageJsonPath = require.resolve(`${packageName}/package.json`, { paths: [__dirname] });
  return path.join(path.dirname(packageJsonPath), relativePath);
}

module.exports = {
  dependencies: {
    "@react-native-community/netinfo": {
      platforms: {
        android: {
          packageImportPath: "import com.reactnativecommunity.netinfo.NetInfoPackage;",
          packageInstance: "new NetInfoPackage()",
          sourceDir: resolvePackagePath("@react-native-community/netinfo", "android"),
        },
      },
    },
    "react-native-svg": {
      platforms: {
        android: {
          packageImportPath: "import com.horcrux.svg.SvgPackage;",
          packageInstance: "new SvgPackage()",
          sourceDir: resolvePackagePath("react-native-svg", "android"),
        },
      },
    },
  },
};
