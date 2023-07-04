//
//  Backbase+Session.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 29/06/15.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASESESSION_CLASS
#define BACKBASESESSION_CLASS

@interface Backbase (Session)

/**
 * Registers an instance of AuthClient that will be used throughout the app to authenticate/authorize the user for
 * different operations.
 * @param authClient The instance of the AuthClient to be used.
 */
+ (void)registerAuthClient:(NSObject<AuthClient>* _Nonnull)authClient NS_SWIFT_NAME(register(authClient:));

/**
 * Unregisters the previously set AuthClient.
 */
+ (void)unregisterAuthClient;

/**
 * Retrieves the currently set AuthClient.
 * @return The currently set instance of the AuthClient. If nothing has been set it will return an PasswordAuthClient
 * implementation compatible with Backbase authentication.
 */
+ (NSObject<AuthClient>* _Nonnull)authClient;

@end

#endif
