// 
//  BBAuthenticationFieldNamesConfiguration.h
//  Backbase
//
//  Created by Backbase B.V. on 12/03/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//
 
/// Authentication fields that can be configured to authenticate with Backbase.
@interface BBAuthenticationFieldNamesConfiguration : NSObject
/// Name of the field to be used as username key on the login request. Defaults to: j_username.
@property (strong, nonatomic) NSString* username;

/// Name of the field to be used as password key on the login request. Defaults to: j_password.
@property (strong, nonatomic) NSString* password;
@end
