//
//  DefaultBBBIDiometricAuthenticatorView.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 12/02/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <Backbase/Backbase.h>

#ifndef DEFAULTBBIDBIOMETRICAUTHENTICATORVIEW_CLASS
#define DEFAULTBBIDBIOMETRICAUTHENTICATORVIEW_CLASS

@interface DefaultBBIDBiometricAuthenticatorView : UIView <BBIDBiometricAuthenticatorView>
@property (strong, nonatomic, nonnull) NSObject<BBIDBiometricAuthenticatorContract>* contract;
@end

#endif
