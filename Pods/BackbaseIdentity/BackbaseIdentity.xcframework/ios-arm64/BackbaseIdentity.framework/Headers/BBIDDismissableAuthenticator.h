// 
//  BBIDDismissableAuthenticator.h
//  Backbase
//
//  Created by Backbase B.V. on 12/06/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBIDDISMISSABLEAUTHENTICATOR_PROTOCOL
#define BBIDDISMISSABLEAUTHENTICATOR_PROTOCOL

/// Protocol to define the trait of an authenticator that can be dismissed.
@protocol BBIDDismissableAuthenticator <NSObject>
@property (assign, nonatomic) BOOL wasExplictlyDismissed;
@end

#endif
NS_ASSUME_NONNULL_END
