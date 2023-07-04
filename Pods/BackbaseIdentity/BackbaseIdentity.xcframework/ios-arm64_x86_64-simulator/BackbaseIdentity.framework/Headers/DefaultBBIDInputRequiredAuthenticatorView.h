//
//  DefaultBBIDInputRequiredAuthenticatorWidgetView.h
//  Backbase
//
//  Created by Ignacio Calderon on 31/12/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

#import <UIKit/UIKit.h>
#import <Backbase/Backbase.h>
#import "BBIDInputRequiredAuthenticatorContract.h"
#import "BBIDInputRequiredAuthenticatorView.h"

#ifndef DEFAULTBBIDINPUTREQUIREDAUTHENTICATORVIEW_CLASS
#define DEFAULTBBIDINPUTREQUIREDAUTHENTICATORVIEW_CLASS

NS_ASSUME_NONNULL_BEGIN

@interface DefaultBBIDInputRequiredAuthenticatorView : UIView <BBIDInputRequiredAuthenticatorView>
@property (strong, nonatomic) NSObject<BBIDInputRequiredAuthenticatorContract>* contract;
@end

NS_ASSUME_NONNULL_END

#endif
