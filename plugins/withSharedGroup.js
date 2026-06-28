const { withXcodeProject, withMainApplication, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// iOS SharedGroup config
function withIosSharedGroup(config) {
  return withXcodeProject(config, async (config) => {
    const proj = config.modResults;
    const { projectRoot, platformProjectRoot } = config.modRequest;
    const projectName = config.modRequest.projectName || config.name;

    const templateDir = path.join(projectRoot, 'ios-widget-templates');
    const iosAppDir = path.join(platformProjectRoot, projectName);

    fs.mkdirSync(iosAppDir, { recursive: true });

    // Copy bridge files to main app folder
    fs.copyFileSync(
      path.join(templateDir, 'SharedGroup.swift'),
      path.join(iosAppDir, 'SharedGroup.swift')
    );
    fs.copyFileSync(
      path.join(templateDir, 'SharedGroup.m'),
      path.join(iosAppDir, 'SharedGroup.m')
    );

    // Configure Bridging Header
    const bridgingHeaderPath = path.join(iosAppDir, `${projectName}-Bridging-Header.h`);
    if (fs.existsSync(bridgingHeaderPath)) {
      let content = fs.readFileSync(bridgingHeaderPath, 'utf8');
      if (!content.includes('RCTBridgeModule.h')) {
        content += '\n#import <React/RCTBridgeModule.h>\n';
        fs.writeFileSync(bridgingHeaderPath, content);
        console.log('React headers imported in Bridging Header.');
      }
    }

    // Link files to main target
    const mainTargetUuid = proj.getFirstProject().firstProject.targets[0].value;
    const mainGroupKey = proj.findPBXGroupKey({ name: projectName });
    if (mainGroupKey) {
      const hasSharedGroupSwift = Object.values(proj.pbxFileReferenceSection()).some(
        f => f.path === `"${projectName}/SharedGroup.swift"` || f.path === `${projectName}/SharedGroup.swift`
      );
      if (!hasSharedGroupSwift) {
        proj.addSourceFile(`${projectName}/SharedGroup.swift`, { target: mainTargetUuid }, mainGroupKey);
      }

      const hasSharedGroupM = Object.values(proj.pbxFileReferenceSection()).some(
        f => f.path === `"${projectName}/SharedGroup.m"` || f.path === `${projectName}/SharedGroup.m`
      );
      if (!hasSharedGroupM) {
        proj.addSourceFile(`${projectName}/SharedGroup.m`, { target: mainTargetUuid }, mainGroupKey);
      }
    }

    return config;
  });
}

// Android SharedGroup config
const withAndroidSharedGroupFiles = (config) => {
  return withAndroidManifest(config, async (config) => {
    const { projectRoot } = config.modRequest;
    const templateDir = path.join(projectRoot, 'android-templates', 'shared');
    const androidAppDir = path.join(projectRoot, 'android', 'app');
    
    if (!fs.existsSync(androidAppDir)) {
      return config;
    }
    
    const javaDir = path.join(androidAppDir, 'src', 'main', 'java', 'com', 'doparatio', 'app');
    fs.mkdirSync(javaDir, { recursive: true });
    
    fs.copyFileSync(path.join(templateDir, 'SharedGroupModule.kt'), path.join(javaDir, 'SharedGroupModule.kt'));
    fs.copyFileSync(path.join(templateDir, 'SharedGroupPackage.kt'), path.join(javaDir, 'SharedGroupPackage.kt'));
    
    console.log('Android SharedGroup files copied successfully.');
    return config;
  });
};

const withAndroidSharedGroupMainApplication = (config) => {
  return withMainApplication(config, (config) => {
    let contents = config.modResults.contents;
    
    if (!contents.includes('SharedGroupPackage()')) {
      const packageListHook = 'PackageList(this).packages.apply {';
      if (contents.includes(packageListHook)) {
        contents = contents.replace(
          packageListHook,
          `${packageListHook}\n          add(SharedGroupPackage())`
        );
        console.log('SharedGroupPackage added to MainApplication.kt');
      }
    }
    
    config.modResults.contents = contents;
    return config;
  });
};

module.exports = function withSharedGroup(config) {
  config = withIosSharedGroup(config);
  config = withAndroidSharedGroupFiles(config);
  config = withAndroidSharedGroupMainApplication(config);
  return config;
};
