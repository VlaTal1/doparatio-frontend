#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SharedGroup, NSObject)

RCT_EXTERN_METHOD(setString:(NSString *)key
                  value:(NSString *)value
                  suiteName:(NSString *)suiteName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getString:(NSString *)key
                  suiteName:(NSString *)suiteName
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reloadAllTimelines:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

