//
//  DefaultBBIDOOBAuthSessionAuthenticatorWidgetView.h
//  Backbase
//
//  Created by Backbase B.V. on 03/08/2020.
//  Copyright © 2020 Backbase R&D B.V. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <Backbase/Backbase.h>
#import "BBIDOOBAuthSessionAuthenticatorContract.h"
#import "BBIDOOBAuthSessionAuthenticatorView.h"

#ifndef DEFAULTBBIDOOBAUTHSESSIONAUTHENTICATORVIEW_CLASS
#define DEFAULTBBIDOOBAUTHSESSIONAUTHENTICATORVIEW_CLASS

NS_ASSUME_NONNULL_BEGIN

@interface DefaultBBIDOutOfBandAuthSessionAuthenticatorView : UIView <BBIDOutOfBandAuthSessionAuthenticatorView>
@property (strong, nonatomic) NSObject<BBIDOutOfBandAuthSessionAuthenticatorContract>* contract;
@end

NS_ASSUME_NONNULL_END

#endif
