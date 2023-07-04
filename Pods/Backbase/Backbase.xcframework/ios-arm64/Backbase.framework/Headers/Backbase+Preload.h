//
//  Backbase+Preload.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 17/06/15.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASEPRELOAD_CLASS
#define BACKBASEPRELOAD_CLASS

@interface Backbase (Preload)
/**
 * Registers an object's selector to observe preload event.
 * @param obj The object owner of the selector to be called when an event occurs.
 * @param selector Selector to be executed. It must receive only one parameter NSNotification.
 */
+ (void)registerPreloadObserver:(id _Nonnull)obj
                       selector:(SEL _Nonnull)selector NS_SWIFT_NAME(register(preloadObserver:selector:));

/**
 * Unegisters an object as respondant to the preload event.
 * @param obj The object that is responding to the preload event.
 */
+ (void)unregisterPreloadObserver:(id _Nonnull)obj NS_SWIFT_NAME(unregister(preloadObserver:));

@end

#endif
