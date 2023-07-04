// 
//  BBIDSilentAuthenticator.h
//  Backbase
//
//  Created by Backbase B.V. on 12/06/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDSILENTAUTHENTICATOR_PROTOCOL
#define BBIDSILENTAUTHENTICATOR_PROTOCOL

/// Protocol to define the trait of a Silent authenticator.
@protocol BBIDSilentAuthenticator <NSObject>
/// Starts an authenticator without need for a view or user interaction
/// @discussion This method is for internal uses only and should not be called directly.
- (void)startSilently;
@end

#endif

NS_ASSUME_NONNULL_END
