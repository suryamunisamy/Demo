//
//  DefaultBBIDUpdatePasswordAuthenticatorWidgetView.h
//  Backbase
//
//  Created by Backbase B.V. on 11/03/2020.
//  Copyright © 2020 Backbase R&D B.V. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <Backbase/Backbase.h>
#import "BBIDUpdatePasswordAuthenticatorContract.h"
#import "BBIDUpdatePasswordAuthenticatorView.h"

#ifndef DEFAULTBBIDUPDATEPASSWORDAUTHENTICATORVIEW_CLASS
#define DEFAULTBBIDUPDATEPASSWORDAUTHENTICATORVIEW_CLASS

NS_ASSUME_NONNULL_BEGIN

@interface DefaultBBIDUpdatePasswordAuthenticatorView : UIView <BBIDUpdatePasswordAuthenticatorView>
@property (strong, nonatomic) NSObject<BBIDUpdatePasswordAuthenticatorContract>* contract;
@end

NS_ASSUME_NONNULL_END

#endif
