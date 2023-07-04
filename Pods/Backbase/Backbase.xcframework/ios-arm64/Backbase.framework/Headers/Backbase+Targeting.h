//
//  Backbase+Targeting.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 10/05/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASETARGETING_CLASS
#define BACKBASETARGETING_CLASS

@interface Backbase (Targeting)
/**
 * Adds a targeting parameter to be send to the server when the model is requested.
 * The parameter will be added as a header with the prefix <b>X-Targeting-</b>, to allow easier filtering/parsing on the
 * server collector. For instance, calling this method with key="myparam" value="3.14" will result in a header called
 * <pre>X-Targeting-myparam: 3.14</pre>
 * @discussion Not all characters are valid as a key. For this reason, colons (:) are replaced with dashes (-), and
 * space (0x20) are replaced with underscore (_).
 * @param value The value to be send as the parameter
 * @param key   The name of the parameter
 * @return The previous value on the same key, otherwise nil
 */
+ (NSString* _Nullable)addTargetingParameter:(NSString* _Nullable)value forKey:(NSString* _Nonnull)key;

/**
 * Clears the targeting parameters. This method may be useful when the model is invalidated to personalize the
 * experience of the non-authenticated phase.
 */
+ (void)clearTargetingParameters;

/**
 * Removes a single parameter. Subsequent call won't contain this parameter until re-added.
 * @param key The name of the parameter to be removed.
 * @return The previous value on the same key, otherwise nil.
 */
+ (NSString* _Nullable)removeTargetingParameter:(NSString* _Nonnull)key;

/**
 * Selects a targeting alternative from the targeting container. The completion handler will receive a Renderable
 * object, that can be one of the following:
 * <ul>
 * <li>renderable received as parameter. If the given renderable is not a targeting container.</li>
 * <li>fallback alternative. If the service can't select any other alternative or Backbase server version is < 6.0.0
 * </li>
 * <li>one of the alternatives. If the service can select any of the alternatives.</li>
 * </ul>
 * @param renderable Renderable object that should be a targeting container to select the alternative from.
 * @param completionHandler Handler block to be executed when the alternative is selected.
 */
+ (void)selectTargetingAlternativeFor:(NSObject<Renderable>* _Nonnull)renderable
                    completionHandler:(BBTargetingSelectCallback _Nonnull)completionHandler;

/**
 * Selects a targeting alternative from the targeting container providing a set of entries to be evaluated in the
 * selection provess. The completion handler will receive a Renderable object, that can be one of the following:
 * <ul>
 * <li>renderable received as parameter. If the given renderable is not a targeting container.</li>
 * <li>fallback alternative. If the service can't select any other alternative or Backbase server version is < 6.0.0
 * </li>
 * <li>one of the alternatives. If the service can select any of the alternatives.</li>
 * </ul>
 * @param renderable Renderable object that should be a targeting container to select the alternative from.
 * @param entries A dictionary of arrays of strings or JSON equivalent to: { "entry": ["value"], ...}
 * @param completionHandler Handler block to be executed when the alternative is selected.
 */
+ (void)selectTargetingAlternativeFor:(NSObject<Renderable>* _Nonnull)renderable
                              entries:(NSDictionary<NSString*, NSArray<NSString*>*>* _Nonnull)entries
                    completionHandler:(BBTargetingSelectCallback _Nonnull)completionHandler;

/**
 * Import the targeting parameters already set into the Unique User Profile (UUP) of the user. This UUP will be used to
 * determine what alternatives have to be selected for the targeting containers.
 * The completion handler will be called with either a status string or an error object (mutually exclusive).
 * @param completionHandler Handler block to be executed when the operation is completed.
 */
+ (void)executeTargetingUUPWithCompletionHandler:(BBTargetingExecuteCallback _Nonnull)completionHandler;
@end

#endif
