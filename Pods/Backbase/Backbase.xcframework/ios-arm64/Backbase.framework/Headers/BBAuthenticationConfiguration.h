// 
//  BBAuthenticationConfiguration.h
//  Backbase
//
//  Created by Backbase B.V. on 12/03/2018.
//  Copyright © 2018 Backbase B.V. All rights reserved.
//

@class BBAuthenticationFieldNamesConfiguration;

/// Authentication related configurations
@interface BBAuthenticationConfiguration : NSObject
/// Names of fields to be used on the requests.
@property (strong, nonatomic) BBAuthenticationFieldNamesConfiguration* fieldNames;
@end
