#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (SharedGroup, NSObject)

RCT_EXTERN_METHOD(setString : (NSString *)key value : (NSString *)
                      value suiteName : (NSString *)
                          suiteName resolver : (RCTPromiseResolveBlock)
                              resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getString : (NSString *)key suiteName : (NSString *)
                      suiteName resolver : (RCTPromiseResolveBlock)
                          resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reloadAllTimelines : (RCTPromiseResolveBlock)
                      resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isBlockerEnabled : (RCTPromiseResolveBlock)
                      resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setBlockerEnabled : (BOOL)enabled resolver : (
    RCTPromiseResolveBlock)resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasUsageStatsPermission : (RCTPromiseResolveBlock)
                      resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(requestUsageStatsPermission : (RCTPromiseResolveBlock)
                      resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(hasOverlayPermission : (RCTPromiseResolveBlock)
                      resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(requestOverlayPermission : (RCTPromiseResolveBlock)
                      resolve rejecter : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(syncConsumedTime : (RCTPromiseResolveBlock)
                      resolve rejecter : (RCTPromiseRejectBlock)reject)

@end
