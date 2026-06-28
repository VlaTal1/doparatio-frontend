const { withAndroidManifest } = require('@expo/config-plugins');
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

module.exports = function withAppBlocker(config) {
  config = withAndroidBlockerFiles(config);
  config = withAndroidBlockerManifest(config);
  return config;
};
