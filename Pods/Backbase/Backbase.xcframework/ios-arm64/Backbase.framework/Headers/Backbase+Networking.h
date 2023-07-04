//
//  Backbase+Networking.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 10/08/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASENETWORKING_CLASS
#define BACKBASENETWORKING_CLASS

@interface Backbase (Networking)

/**
 * Registers an object to respond to HTTP-specific error codes. This method returns if the resolver was successfully
 * registered or not.
 * @param resolver The resolver object to register. It has to conform the ErrorResponseResolver protocol.
 * @param code The HTTP error code that this resolver will deal with. Only error codes can be registered, anything in
 * the range 200-399 (inclusive) will not be registered.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the class was registered successfully.
 */
+ (BOOL)registerErrorResponseResolver:(NSObject<ErrorResponseResolver>* _Nonnull)resolver
                              forCode:(NSInteger)code
                                error:(NSError* _Nullable* _Nullable)error
    NS_SWIFT_NAME(register(errorResponseResolver:forCode:));

/**
 * Unregisters a resolver object for the given code.
 * @param code The code that will stop receiving notifications.
 */
+ (void)unregisterErrorResponseResolverForCode:(NSInteger)code NS_SWIFT_NAME(unregister(errorResponseResolverForCode:));

/**
 * Returns the current resolver object for the given code.
 * @param code The HTTP error code of the resolver to be returned
 */
+ (NSObject<ErrorResponseResolver>* _Nullable)resolverByCode:(NSInteger)code;

@end

#endif
