//
//  Backbase+PubSub.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 17/06/15.
//
#import <Backbase/Backbase.h>

#ifndef BACKBASEPUBSUB_CLASS
#define BACKBASEPUBSUB_CLASS

@interface Backbase (PubSub)
/**
 * Registers an object's selector to observe an especific event.
 * @param obj The object owner of the selector to be called when an event occurs.
 * @param selector Selector to be executed. It must receive only one parameter NSNotification.
 * @param eventName The name of the event listening to.
 */
+ (void)registerObserver:(id _Nonnull)obj
                selector:(SEL _Nonnull)selector
                forEvent:(NSString* _Nonnull)eventName NS_SWIFT_NAME(register(observer:selector:forEvent:));

/**
 * Registers an object's selector to observe an especific event.
 * @param obj The object owner of the selector to be called when an event occurs.
 * @param selector Selector to be executed. It must receive only one parameter NSNotification.
 * @param eventName The name of the event listening to.
 * @param channelName The name of the specific channel.
 */
+ (void)registerObserver:(id _Nonnull)obj
                selector:(SEL _Nonnull)selector
                forEvent:(NSString* _Nonnull)eventName
                    over:(NSString* _Nonnull)channelName
    NS_SWIFT_NAME(register(observer:selector:forEvent:channel:));

/**
 * Unregisters an object as respondant to the navigation flow events.
 * @param obj The object that is responding to the navigation events.
 * @param eventName The name of the event to unsubscribe from.
 */
+ (void)unregisterObserver:(id _Nonnull)obj
                  forEvent:(NSString* _Nonnull)eventName NS_SWIFT_NAME(unregister(observer:forEvent:));

/**
 * Unregisters an object as respondant to the navigation flow events.
 * @param obj The object that is responding to the navigation events.
 * @param eventName The name of the event to unsubscribe from.
 * @param channelName The name of the specific channel.
 */
+ (void)unregisterObserver:(id _Nonnull)obj
                  forEvent:(NSString* _Nonnull)eventName
                      over:(NSString* _Nonnull)channelName NS_SWIFT_NAME(unregister(observer:forEvent:channel:));

/**
 * Unregisters an object as respondant to all its registered events.
 * @param obj The object that is responding to the events.
 */
+ (void)unregisterObserverFromAll:(id _Nonnull)obj NS_SWIFT_NAME(unregister(observer:));

/**
 * Publishes an event with an especific payload to whoever is listening to it (natively or in a webview)
 * @param eventName The name of the event to be published.
 * @param jsonObject The payload to be passed as information to the event. May be nil or a JSON compatible object.
 */
+ (void)publishEvent:(NSString* _Nonnull)eventName
             payload:(NSDictionary<NSString*, NSObject*>* _Nullable)jsonObject NS_SWIFT_NAME(publish(event:payload:));

/**
 * Publishes an event with an especific payload to whoever is listening to it (natively or in a webview)
 * @param eventName The name of the event to be published.
 * @param channelName The name of the specific channel.
 * @param jsonObject The payload to be passed as information to the event. May be nil or a JSON compatible object.
 */
+ (void)publishEvent:(NSString* _Nonnull)eventName
                over:(NSString* _Nonnull)channelName
             payload:(NSDictionary<NSString*, NSObject*>* _Nullable)jsonObject
    NS_SWIFT_NAME(publish(event:channel:payload:));

/**
 * Publishes an event with an especific payload to whoever is listening to it (natively or in a webview)
 * @param eventName The name of the event to be published.
 * @param object The object originating this event. This is required when sending messages from native widgets to
 * identify the source properly. This object can be a NSObject&lt;Renderable&gt; instance or a NSObject&lt;Renderer&gt;
 * instance.
 * @param jsonObject The payload to be passed as information to the event. May be nil or a JSON compatible object.
 */
+ (void)publishEvent:(NSString* _Nonnull)eventName
              object:(id _Nonnull)object
             payload:(NSDictionary<NSString*, NSObject*>* _Nullable)jsonObject
    NS_SWIFT_NAME(publish(event:object:payload:));

/**
 * Publishes an event with an especific payload to whoever is listening to it (natively or in a webview)
 * @param eventName The name of the event to be published.
 * @param channelName The name of the specific channel.
 * @param object The object originating this event. This is required when sending messages from native widgets to
 * identify the source properly. This object can be a NSObject&lt;Renderable&gt; instance or a NSObject&lt;Renderer&gt;
 * instance.
 * @param jsonObject The payload to be passed as information to the event. May be nil or a JSON compatible object.
 */
+ (void)publishEvent:(NSString* _Nonnull)eventName
                over:(NSString* _Nonnull)channelName
              object:(id _Nonnull)object
             payload:(NSDictionary<NSString*, NSObject*>* _Nullable)jsonObject
    NS_SWIFT_NAME(publish(event:channel:object:payload:));
@end

#endif
