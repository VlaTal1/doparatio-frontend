const { withXcodeProject, withAndroidManifest } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidBlockerFiles = (config) => {
  return withAndroidManifest(config, async (config) => {
    const { projectRoot } = config.modRequest;
    const templateDir = path.join(projectRoot, 'android-templates', 'blocker');
    const androidAppDir = path.join(projectRoot, 'android', 'app');
    
    if (!fs.existsSync(androidAppDir)) {
      return config;
    }
    
    const javaDir = path.join(androidAppDir, 'src', 'main', 'java', 'com', 'doparatio', 'app');
    const resDir = path.join(androidAppDir, 'src', 'main', 'res');
    const layoutDir = path.join(resDir, 'layout');
    const drawableDir = path.join(resDir, 'drawable');
    const valuesDir = path.join(resDir, 'values');
    
    fs.mkdirSync(javaDir, { recursive: true });
    fs.mkdirSync(layoutDir, { recursive: true });
    fs.mkdirSync(drawableDir, { recursive: true });
    fs.mkdirSync(valuesDir, { recursive: true });
    
    fs.copyFileSync(path.join(templateDir, 'AppBlockerService.kt'), path.join(javaDir, 'AppBlockerService.kt'));
    fs.copyFileSync(path.join(templateDir, 'BootReceiver.kt'), path.join(javaDir, 'BootReceiver.kt'));
    fs.copyFileSync(path.join(templateDir, 'LockActivity.kt'), path.join(javaDir, 'LockActivity.kt'));
    
    fs.copyFileSync(path.join(templateDir, 'activity_lock.xml'), path.join(layoutDir, 'activity_lock.xml'));
    fs.copyFileSync(path.join(templateDir, 'btn_primary_bg.xml'), path.join(drawableDir, 'btn_primary_bg.xml'));
    fs.copyFileSync(path.join(templateDir, 'btn_secondary_bg.xml'), path.join(drawableDir, 'btn_secondary_bg.xml'));
    fs.copyFileSync(path.join(templateDir, 'values', 'strings_lock.xml'), path.join(valuesDir, 'strings_lock.xml'));
    
    console.log('Android App Blocker files copied successfully.');
    return config;
  });
};

const withAndroidBlockerManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainApplication = androidManifest.manifest.application[0];
    
    function addPermission(permissionName, extraAttributes = {}) {
      if (!androidManifest.manifest['uses-permission']) {
        androidManifest.manifest['uses-permission'] = [];
      }
      const hasPermission = androidManifest.manifest['uses-permission'].some(
        p => p.$['android:name'] === permissionName
      );
      if (!hasPermission) {
        androidManifest.manifest['uses-permission'].push({
          $: {
            'android:name': permissionName,
            ...extraAttributes
          }
        });
      }
    }

    addPermission('android.permission.FOREGROUND_SERVICE');
    addPermission('android.permission.FOREGROUND_SERVICE_SPECIAL_USE');
    addPermission('android.permission.PACKAGE_USAGE_STATS', { 'tools:ignore': 'ProtectedPermissions' });
    addPermission('android.permission.RECEIVE_BOOT_COMPLETED');

    // Add BootReceiver
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }
    const hasBootReceiver = mainApplication.receiver.some(
      r => r.$['android:name'] === 'com.doparatio.app.BootReceiver'
    );
    if (!hasBootReceiver) {
      mainApplication.receiver.push({
        $: {
          'android:name': 'com.doparatio.app.BootReceiver',
          'android:exported': 'true'
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.intent.action.BOOT_COMPLETED'
                }
              }
            ]
          }
        ]
      });
    }

    // Add LockActivity
    if (!mainApplication.activity) {
      mainApplication.activity = [];
    }
    const hasLockActivity = mainApplication.activity.some(
      a => a.$['android:name'] === 'com.doparatio.app.LockActivity'
    );
    if (!hasLockActivity) {
      mainApplication.activity.push({
        $: {
          'android:name': 'com.doparatio.app.LockActivity',
          'android:theme': '@android:style/Theme.NoTitleBar.Fullscreen',
          'android:excludeFromRecents': 'true',
          'android:launchMode': 'singleTask',
          'android:exported': 'false'
        }
      });
    }

    // Add AppBlockerService
    if (!mainApplication.service) {
      mainApplication.service = [];
    }
    const hasService = mainApplication.service.some(
      s => s.$['android:name'] === 'com.doparatio.app.AppBlockerService'
    );
    if (!hasService) {
      mainApplication.service.push({
        $: {
          'android:name': 'com.doparatio.app.AppBlockerService',
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'specialUse'
        },
        'property': [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'App blocker service to restrict screen time'
            }
          }
        ]
      });
    }

    return config;
  });
};

const withIosAppBlocker = (config) => {
  return withXcodeProject(config, async (config) => {
    const proj = config.modResults;
    const { projectRoot, platformProjectRoot } = config.modRequest;
    
    const templateDir = path.join(projectRoot, 'ios-blocker-templates');
    if (!fs.existsSync(templateDir)) {
      return config;
    }

    const targets = [
      {
        name: 'DeviceActivityMonitor',
        sourceFile: 'DeviceActivityMonitor.swift',
        infoPlist: 'DeviceActivityMonitor-Info.plist',
      },
      {
        name: 'ShieldConfiguration',
        sourceFile: 'ShieldConfiguration.swift',
        infoPlist: 'ShieldConfiguration-Info.plist',
      },
      {
        name: 'ShieldAction',
        sourceFile: 'ShieldAction.swift',
        infoPlist: 'ShieldAction-Info.plist',
      }
    ];

    const mainTargetUuid = proj.getFirstProject().firstProject.targets[0].value;

    targets.forEach(targetSpec => {
      const targetName = targetSpec.name;
      const targetDir = path.join(platformProjectRoot, targetName);
      
      fs.mkdirSync(targetDir, { recursive: true });

      // Copy template files to target directory
      fs.copyFileSync(path.join(templateDir, targetSpec.sourceFile), path.join(targetDir, targetSpec.sourceFile));
      fs.copyFileSync(path.join(templateDir, targetSpec.infoPlist), path.join(targetDir, 'Info.plist'));
      fs.copyFileSync(path.join(templateDir, 'Extensions.entitlements'), path.join(targetDir, `${targetName}.entitlements`));

      const targetExists = proj.getFirstProject().firstProject.targets.some(
        t => proj.pbxNativeTargetSection()[t.value]?.name === `"${targetName}"`
      );

      if (!targetExists) {
        console.log(`Creating iOS target "${targetName}"...`);
        const nativeTarget = proj.addTarget(targetName, 'app_extension', targetName);
        const targetUuid = nativeTarget.uuid;

        // Create build phases
        proj.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', targetUuid);
        proj.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', targetUuid);

        // Create PBX group
        const targetGroup = proj.addPbxGroup([], targetName, targetName);
        proj.addToPbxGroup(targetGroup.uuid, proj.getFirstProject().firstProject.mainGroup);

        // Add source and entitlements files
        proj.addSourceFile(targetSpec.sourceFile, { target: targetUuid }, targetGroup.uuid);
        proj.addFile(`${targetName}.entitlements`, targetGroup.uuid);

        // Configure configurations
        const buildConfigs = proj.pbxXCConfigurationList()[nativeTarget.pbxNativeTarget.buildConfigurationList];
        const buildConfigurations = buildConfigs.buildConfigurations;

        buildConfigurations.forEach(configObj => {
          const key = configObj.value;
          if (key && key.length === 24) {
            const cfg = proj.pbxXCBuildConfigurationSection()[key];
            if (cfg && cfg.buildSettings) {
              cfg.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `\"com.doparatio.app.${targetName}\"`;
              cfg.buildSettings.INFOPLIST_FILE = `\"${targetName}/Info.plist\"`;
              cfg.buildSettings.CODE_SIGN_ENTITLEMENTS = `\"${targetName}/${targetName}.entitlements\"`;
              cfg.buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
              cfg.buildSettings.SWIFT_VERSION = '5.0';
              cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '17.0';
              cfg.buildSettings.PRODUCT_NAME = `\"${targetName}\"`;
              cfg.buildSettings.MARKETING_VERSION = '"1.0.0"';
              cfg.buildSettings.CURRENT_PROJECT_VERSION = '"1"';
              cfg.buildSettings.GENERATE_INFOPLIST_FILE = 'YES';
              cfg.buildSettings.SWIFT_EMIT_LOC_STRINGS = 'YES';
              cfg.buildSettings.SKIP_INSTALL = 'YES';
            }
          }
        });

        // Add dependency
        proj.addTargetDependency(mainTargetUuid, [targetUuid]);
        console.log(`Configured target dependency: Main target depends on "${targetName}".`);
      } else {
        console.log(`iOS target "${targetName}" already exists, skipping.`);
      }
    });

    return config;
  });
};

module.exports = function withAppBlocker(config) {
  config = withAndroidBlockerFiles(config);
  config = withAndroidBlockerManifest(config);
  config = withIosAppBlocker(config);
  return config;
};
