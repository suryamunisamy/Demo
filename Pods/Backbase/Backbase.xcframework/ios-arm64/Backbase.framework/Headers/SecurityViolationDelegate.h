//
//  SecurityViolationDelegate.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 04/08/15.
//  Copyright (c) 2015 Backbase R&D B.V. All rights reserved.
//

/**
 * ViolationDelegate protocol. The conforming object will be notified about security violations, e.g. if a widget
 * tries to access a domain that has not been whitelisted in the BBConfiguration.security.allowedDomains
 */
@protocol SecurityViolationDelegate <NSObject>
@required

/**
 * Notifies the conforming object that a violation has occurred in the system. The violations by definition are severe
 * errors. Therefore, an error object will be send back to the developer to deal with it as desired.
 * @discussion Violations can range from access denied by the configuration (whitelisting) to security being compromised
 * (potential man-in-the-middle attack, trying to access a SSL domain with a self-signed certificated)
 * @param error The error object containing a description of the type of violation that took place.
 */
- (void)securityDidReceiveViolation:(NSError* _Nonnull)error;

@end
