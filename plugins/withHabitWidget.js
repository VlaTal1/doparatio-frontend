const { withXcodeProject, withAndroidManifest, withMainApplication } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function generateUUID() {
  return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('');
}

// -------------------------------------------------------------------------
// iOS WIDGET CONFIGURATION
// -------------------------------------------------------------------------
function withIosHabitWidget(config) {
  return withXcodeProject(config, async (config) => {
    const proj = config.modResults;
    const { projectRoot, platformProjectRoot } = config.modRequest;
    const projectName = config.modRequest.projectName || config.name;

    const templateDir = path.join(projectRoot, 'ios-widget-templates');
    const iosAppDir = path.join(platformProjectRoot, projectName);
    const iosWidgetDir = path.join(platformProjectRoot, 'HabitWidget');

    // 1. Ensure target directories exist and copy files
    fs.mkdirSync(iosAppDir, { recursive: true });
    fs.mkdirSync(iosWidgetDir, { recursive: true });

    // Copy bridge files to main app folder
    fs.copyFileSync(
      path.join(templateDir, 'SharedGroup.swift'),
      path.join(iosAppDir, 'SharedGroup.swift')
    );
    fs.copyFileSync(
      path.join(templateDir, 'SharedGroup.m'),
      path.join(iosAppDir, 'SharedGroup.m')
    );

    // Configure Bridging Header to expose React headers to Swift
    const bridgingHeaderPath = path.join(iosAppDir, `${projectName}-Bridging-Header.h`);
    if (fs.existsSync(bridgingHeaderPath)) {
      let content = fs.readFileSync(bridgingHeaderPath, 'utf8');
      if (!content.includes('RCTBridgeModule.h')) {
        content += '\n#import <React/RCTBridgeModule.h>\n';
        fs.writeFileSync(bridgingHeaderPath, content);
        console.log('React headers imported in Bridging Header.');
      }
    } else {
      console.warn(`Bridging header not found at: ${bridgingHeaderPath}`);
    }

    // Copy widget files to widget target folder
    fs.copyFileSync(
      path.join(templateDir, 'HabitWidget.swift'),
      path.join(iosWidgetDir, 'HabitWidget.swift')
    );
    fs.copyFileSync(
      path.join(templateDir, 'HabitWidgetIntents.swift'),
      path.join(iosWidgetDir, 'HabitWidgetIntents.swift')
    );
    fs.copyFileSync(
      path.join(templateDir, 'Info.plist'),
      path.join(iosWidgetDir, 'Info.plist')
    );
    fs.copyFileSync(
      path.join(templateDir, 'HabitWidget.entitlements'),
      path.join(iosWidgetDir, 'HabitWidget.entitlements')
    );

    console.log('Widget template files copied successfully.');

    // 2. Xcode Project Target configurations
    const mainTargetUuid = proj.getFirstProject().firstProject.targets[0].value;
    const mainGroupKey = proj.findPBXGroupKey({ name: projectName });
    if (!mainGroupKey) {
      throw new Error(`Main ${projectName} group not found in Xcode project.`);
    }

    // Link SharedGroup files to main target if not already linked
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

    console.log('SharedGroup files linked to main target.');

    // Create Widget Target if not exists
    const widgetTargetName = 'HabitWidget';
    const targets = proj.getFirstProject().firstProject.targets;
    const targetExists = targets.some(
      t => proj.pbxNativeTargetSection()[t.value]?.name === `"${widgetTargetName}"`
    );

    if (!targetExists) {
      console.log(`Creating target "${widgetTargetName}"...`);
      const widgetTarget = proj.addTarget(widgetTargetName, 'app_extension', widgetTargetName);
      const widgetTargetUuid = widgetTarget.uuid;

      // Create build phases for the widget target first
      proj.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', widgetTargetUuid);
      proj.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', widgetTargetUuid);

      // Create group for HabitWidget and add source files
      const widgetGroup = proj.addPbxGroup([], widgetTargetName, widgetTargetName);
      proj.addToPbxGroup(widgetGroup.uuid, proj.getFirstProject().firstProject.mainGroup);

      // Add files with path relative to the group directory 'HabitWidget'
      proj.addSourceFile('HabitWidget.swift', { target: widgetTargetUuid }, widgetGroup.uuid);
      proj.addSourceFile('HabitWidgetIntents.swift', { target: widgetTargetUuid }, widgetGroup.uuid);
      proj.addFile('HabitWidget.entitlements', widgetGroup.uuid);

      // Configure build configurations (bundle ID, Plist, Entitlements, deployment target, Swift version)
      const buildConfigs = proj.pbxXCConfigurationList()[widgetTarget.pbxNativeTarget.buildConfigurationList];
      const buildConfigurations = buildConfigs.buildConfigurations;

      buildConfigurations.forEach(configObj => {
        const key = configObj.value;
        if (key && key.length === 24) {
          const cfg = proj.pbxXCBuildConfigurationSection()[key];
          if (cfg && cfg.buildSettings) {
            cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = '"com.doparatio.app.HabitWidget"';
            cfg.buildSettings.INFOPLIST_FILE = '"HabitWidget/Info.plist"';
            cfg.buildSettings.CODE_SIGN_ENTITLEMENTS = '"HabitWidget/HabitWidget.entitlements"';
            cfg.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
            cfg.buildSettings.SWIFT_VERSION = '5.0';
            cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
            cfg.buildSettings.PRODUCT_NAME = '"HabitWidget"';
            cfg.buildSettings.MARKETING_VERSION = '"1.0.0"';
            cfg.buildSettings.CURRENT_PROJECT_VERSION = '"1"';
            cfg.buildSettings.GENERATE_INFOPLIST_FILE = 'YES';
            cfg.buildSettings.SWIFT_EMIT_LOC_STRINGS = 'YES';
            cfg.buildSettings.SKIP_INSTALL = 'YES';
          }
        }
      });

      console.log('Widget target build settings configured.');

      // Add target dependency (Main app depends on widget)
      proj.addTargetDependency(mainTargetUuid, [widgetTargetUuid]);
      console.log('Target dependency configured: Main target depends on Widget target.');
    } else {
      console.log(`Target "${widgetTargetName}" already exists, skipping addition.`);
      
      // Ensure HabitWidgetIntents.swift is added to the widget target and group if not already there
      const widgetGroupKey = proj.findPBXGroupKey({ name: widgetTargetName });
      const targetObj = targets.find(
        t => proj.pbxNativeTargetSection()[t.value]?.name === `"${widgetTargetName}"`
      );
      const widgetTargetUuid = targetObj ? targetObj.value : null;

      if (widgetGroupKey && widgetTargetUuid) {
        const hasIntentsSwiftWidget = Object.values(proj.pbxFileReferenceSection()).some(
          f => f.path === `"HabitWidget/HabitWidgetIntents.swift"` || f.path === `HabitWidget/HabitWidgetIntents.swift` || f.path === `HabitWidgetIntents.swift`
        );
        if (!hasIntentsSwiftWidget) {
          proj.addSourceFile('HabitWidgetIntents.swift', { target: widgetTargetUuid }, widgetGroupKey);
        }
      }
    }

    return config;
  });
}

// -------------------------------------------------------------------------
// Android WIDGET CONFIGURATION
// -------------------------------------------------------------------------
const withAndroidWidgetFiles = (config) => {
  return withAndroidManifest(config, async (config) => {
    const { projectRoot } = config.modRequest;
    const templateDir = path.join(projectRoot, 'android-widget-templates');
    const androidAppDir = path.join(projectRoot, 'android', 'app');
    
    if (!fs.existsSync(androidAppDir)) {
      console.warn('Android directory does not exist, skipping widget copy.');
      return config;
    }
    
    const javaDir = path.join(androidAppDir, 'src', 'main', 'java', 'com', 'doparatio', 'app');
    const resDir = path.join(androidAppDir, 'src', 'main', 'res');
    const layoutDir = path.join(resDir, 'layout');
    const xmlDir = path.join(resDir, 'xml');
    const drawableDir = path.join(resDir, 'drawable');
    const drawableNightDir = path.join(resDir, 'drawable-night');
    const valuesDir = path.join(resDir, 'values');
    const valuesNightDir = path.join(resDir, 'values-night');
    
    fs.mkdirSync(javaDir, { recursive: true });
    fs.mkdirSync(layoutDir, { recursive: true });
    fs.mkdirSync(xmlDir, { recursive: true });
    fs.mkdirSync(drawableDir, { recursive: true });
    fs.mkdirSync(drawableNightDir, { recursive: true });
    fs.mkdirSync(valuesDir, { recursive: true });
    fs.mkdirSync(valuesNightDir, { recursive: true });
    
    const kotlinFiles = [
      'SharedGroupModule.kt',
      'SharedGroupPackage.kt',
      'HabitWidgetProvider.kt',
      'HabitWidgetConfigureActivity.kt'
    ];
    for (const file of kotlinFiles) {
      fs.copyFileSync(path.join(templateDir, file), path.join(javaDir, file));
    }
    
    fs.copyFileSync(path.join(templateDir, 'habit_widget_info.xml'), path.join(xmlDir, 'habit_widget_info.xml'));
    fs.copyFileSync(path.join(templateDir, 'habit_widget_layout.xml'), path.join(layoutDir, 'habit_widget_layout.xml'));
    fs.copyFileSync(path.join(templateDir, 'habit_widget_configure.xml'), path.join(layoutDir, 'habit_widget_configure.xml'));
    fs.copyFileSync(path.join(templateDir, 'habit_widget_configure_item.xml'), path.join(layoutDir, 'habit_widget_configure_item.xml'));
    fs.copyFileSync(path.join(templateDir, 'habit_widget_background.xml'), path.join(drawableDir, 'habit_widget_background.xml'));
    fs.copyFileSync(path.join(templateDir, 'habit_widget_background_night.xml'), path.join(drawableNightDir, 'habit_widget_background.xml'));
    fs.copyFileSync(path.join(templateDir, 'colors-widget.xml'), path.join(valuesDir, 'colors-widget.xml'));
    fs.copyFileSync(path.join(templateDir, 'colors-widget-night.xml'), path.join(valuesNightDir, 'colors-widget.xml'));
    
    console.log('Android widget files copied successfully.');
    return config;
  });
};

const withAndroidWidgetManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];
    
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }
    const hasReceiver = mainApplication.receiver.some(
      r => r.$['android:name'] === 'com.doparatio.app.HabitWidgetProvider'
    );
    if (!hasReceiver) {
      mainApplication.receiver.push({
        $: {
          'android:name': 'com.doparatio.app.HabitWidgetProvider',
          'android:exported': 'false'
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE'
                }
              }
            ]
          }
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/habit_widget_info'
            }
          }
        ]
      });
    }
    
    if (!mainApplication.activity) {
      mainApplication.activity = [];
    }
    const hasActivity = mainApplication.activity.some(
      a => a.$['android:name'] === 'com.doparatio.app.HabitWidgetConfigureActivity'
    );
    if (!hasActivity) {
      mainApplication.activity.push({
        $: {
          'android:name': 'com.doparatio.app.HabitWidgetConfigureActivity',
          'android:exported': 'true'
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.APPWIDGET_CONFIGURE'
                }
              }
            ]
          }
        ]
      });
    }
    
    return config;
  });
};

const withAndroidWidgetMainApplication = (config) => {
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
      } else {
        console.warn('Could not find PackageList hook in MainApplication.kt');
      }
    }
    
    config.modResults.contents = contents;
    return config;
  });
};

function withAndroidHabitWidget(config) {
  config = withAndroidWidgetFiles(config);
  config = withAndroidWidgetManifest(config);
  config = withAndroidWidgetMainApplication(config);
  return config;
}

// -------------------------------------------------------------------------
// MAIN EXPORT
// -------------------------------------------------------------------------
module.exports = function withHabitWidget(config) {
  config = withIosHabitWidget(config);
  config = withAndroidHabitWidget(config);
  return config;
};
