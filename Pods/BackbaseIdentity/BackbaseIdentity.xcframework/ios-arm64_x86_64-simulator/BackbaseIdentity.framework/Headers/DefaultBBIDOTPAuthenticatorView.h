//
//  DefaultBBIDOTPAuthenticatorView.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 23/04/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <Backbase/Backbase.h>
#import "BBIDOTPAuthenticatorContract.h"
#import "BBIDOTPAuthenticatorView.h"

#ifndef DEFAULTBBIDOTPAUTHENTICATORVIEW_CLASS
#define DEFAULTBBIDOTPAUTHENTICATORVIEW_CLASS

@interface DefaultBBIDOTPAuthenticatorView : UIView <BBIDOTPAuthenticatorView>
@property (strong, nonatomic) NSObject<BBIDOTPAuthenticatorContract>* contract;
@end

#endif
