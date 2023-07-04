
//
//  BBOAuth2Configuration.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 18/06/2019.
//  Copyright © 2019 Backbase R&D B.V. All rights reserved.
//

/// OAuth2 configurations
@interface BBOAuth2Configuration : NSObject

/// Endpoint used to obtain the tokens
@property (strong, nonatomic, nonnull) NSString* tokenEndpoint;

/// Client Id to be used when authenticating
@property (strong, nonatomic, nonnull) NSString* clientId;

@end
