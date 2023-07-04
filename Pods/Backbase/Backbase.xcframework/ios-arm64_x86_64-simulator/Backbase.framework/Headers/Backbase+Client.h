//
//  Backbase+Client.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 20/07/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef BACKBASECLIENT_CLASS
#define BACKBASECLIENT_CLASS

@interface Backbase (Client)

/**
 * Registers a class to respond as a client. This method returns if the client was successfully registered or not.
 * @param client The class defining the client to register. It has to conform the DBSClient protocol.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES if the class was registered successfully.
 */
+ (BOOL)registerClient:(NSObject<DBSClient>* _Nonnull)client
                 error:(NSError* _Nullable* _Nullable)error NS_SWIFT_NAME(register(client:));

/**
 * Unregisters a client class.
 * @param client The class defining the client to unregister
 */
+ (void)unregisterClient:(NSObject<DBSClient>* _Nonnull)client NS_SWIFT_NAME(unregister(client:));

/**
 * Returns the instance of the registered client of the given type or that is a subclass of the given type.
 * @param clientType The class of the client type to look up.
 * @return The registered client instance if any. nil otherwise.
 */
+ (NSObject<DBSClient>* _Nullable)registeredClient:(Class _Nonnull)clientType NS_SWIFT_NAME(registered(client:));

@end

#endif
