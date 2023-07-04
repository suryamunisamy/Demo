//
//  BBAuthClient.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 07/11/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
@protocol PasswordAuthClient;

#ifndef BBAUTHCLIENT_CLASS
#define BBAUTHCLIENT_CLASS

@interface BBAuthClient : NSObject <PasswordAuthClient>
@property (weak, nonatomic, nullable) NSObject<AuthClientDelegate>* delegate;

- (instancetype _Nonnull)init NS_UNAVAILABLE;
- (instancetype _Nonnull)initWithConfiguration:(BBConfiguration* _Nonnull)configuration NS_DESIGNATED_INITIALIZER;
@end

#endif
