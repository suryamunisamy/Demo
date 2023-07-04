//
//  Backbase+NavigationFlowInformer.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 17/06/15.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASENAVIGATIONFLOWINFORMER_CLASS
#define BACKBASENAVIGATIONFLOWINFORMER_CLASS

@interface Backbase (NavigationFlowInformer)

/**
 * Registers an object's selector to respond to the navigation flow events.
 * @param obj The object owner of the selector to be called when an event occurs.
 * @param selector Selector to be executed. It must receive only one parameter NSNotification.
 */
+ (void)registerNavigationEventListener:(id _Nonnull)obj
                               selector:(SEL _Nonnull)selector NS_SWIFT_NAME(register(navigationEventListener:selector:));

/**
 * Unregisters an object's as respondant to the navigation flow events.
 * @param obj The object that is responding to the navigation events.
 */
+ (void)unregisterNavigationEventListener:(id _Nonnull)obj NS_SWIFT_NAME(unregister(navigationEventListener:));
@end

#endif
