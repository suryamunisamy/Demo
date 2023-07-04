// 
//  BBOAuth2InvalidRefreshTokenResolver.h
//  Backbase
//
//  Created by Backbase B.V. on 15/05/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>

#ifndef BBOAUTH2INVALIDREFRESHTOKENRESOLVER_CLASS
#define BBOAUTH2INVALIDREFRESHTOKENRESOLVER_CLASS

@interface BBOAuth2InvalidRefreshTokenResolver : NSObject <ErrorResponseResolver>

- (instancetype _Nonnull)initWithAuthClient:(NSObject<OAuth2AuthClient>* _Nonnull)authClient;
@end

#endif
