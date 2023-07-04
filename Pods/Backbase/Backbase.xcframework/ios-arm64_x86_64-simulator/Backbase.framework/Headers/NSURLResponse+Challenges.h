// 
//  NSHTTPURLResponse+Challenges.h
//  Backbase
//
//  Created by Backbase B.V. on 18/09/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface NSURLResponse (Challenges)
- (void)setUnderlyingError:(NSError*)error;
- (void)clearUnderlyingError;
- (NSError* _Nullable)underlyingError;
@end

NS_ASSUME_NONNULL_END
