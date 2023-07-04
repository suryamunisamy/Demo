// 
//  DefaultBBIDPasscodeAuthenticatorView.h
//  Backbase
//
//  Created by Backbase B.V. on 08/10/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <UIKit/UIKit.h>
#import <Backbase/Backbase.h>

#ifndef DEFAULTBBIDPASSCODEAUTHENTICATORVIEW_CLASS
#define DEFAULTBBIDPASSCODEAUTHENTICATORVIEW_CLASS

NS_ASSUME_NONNULL_BEGIN

@interface DefaultBBIDPasscodeAuthenticatorView : UIView <BBIDPasscodeAuthenticatorView>
@property (strong, nonatomic, nonnull) NSObject<BBIDPasscodeAuthenticatorContract>* contract;
@end

NS_ASSUME_NONNULL_END

#endif
