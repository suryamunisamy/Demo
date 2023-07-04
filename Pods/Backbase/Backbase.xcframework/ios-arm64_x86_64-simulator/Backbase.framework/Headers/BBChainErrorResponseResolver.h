// 
//  BBChainErrorResponseResolver.h
//  Backbase
//
//  Created by Backbase B.V. on 11/12/2019.
//  Copyright © 2019 Backbase B.V. All rights reserved.
//
 

#import <Foundation/Foundation.h>
#import <Backbase/ErrorResponseResolver.h>

NS_ASSUME_NONNULL_BEGIN

#ifndef BBCHAINERRORRESPONSERESOLVER_CLASS
#define BBCHAINERRORRESPONSERESOLVER_CLASS

/// This error response resolver checks each attached resolver in the same order they were inserted
/// The resolution is first-match-stops, is up to the user to define the order of evaluation by inserting them in the
/// expected evaluation order
@interface BBChainErrorResponseResolver : NSObject <ErrorResponseResolver>

/// Default constructor
- (instancetype)init NS_UNAVAILABLE;

/**
 * Initializes an error response resolver with the resolvers to be used and the given initial order.
 * @param resolvers The resolvers to be used by this Error response resolver.
 */
- (instancetype)initWithResolversChain:(NSArray<NSObject<ErrorResponseResolver>*>*)resolvers;

/**
 Returns whether the specified class is included in the chain of resolvers
 @param resolverClass The class to check for
 */
- (BOOL)isResolverChained:(Class)resolverClass;

@end

#endif

NS_ASSUME_NONNULL_END
