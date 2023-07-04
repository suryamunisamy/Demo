// 
//  OAuth2ROPCGrant.h
//  Backbase
//
//  Created by Backbase B.V. on 29/03/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import <Backbase/PasswordAuthClient.h>

/**
 * OAuth2 Resource Owner Password Credentials Grant protocol. Allows the implementing class to use the resource owner's
 * username and password to authenticate and authorize the application on a single call.
 * @discussion This protocol is an alias of PasswordAuthClient and allows the consumer to used them interchangeably.
 */
@protocol OAuth2ROPCGrant <PasswordAuthClient>
@end
