// See LICENSE file

#import <Foundation/Foundation.h>
#import "JXcore.h"
#import "JXcoreExtension.h"
#import "CDVJXcore.h"

@implementation JXcoreExtension
{}

- (void) defineMethods {
  [JXcore addNativeBlock:^(NSArray *params, NSString *callbackId) {
    NSString *str = @"";
    for (id p in params) {
        if ([p isKindOfClass:[NSString class]] && [p rangeOfString:@"jxcore_callback"].location != NSNotFound) {
            continue;
        }
        str = [str stringByAppendingString:[NSString stringWithFormat:@"%@",p]];
    }
    NSLog(@"%@",str);
  } withName:@"Log"];

  [JXcore addNativeBlock:^(NSArray *params, NSString *callbackId) {
    [[UIApplication sharedApplication] openURL:[NSURL  URLWithString:UIApplicationOpenSettingsURLString]];
  } withName:@"RedirectToSettings"];
}
@end
