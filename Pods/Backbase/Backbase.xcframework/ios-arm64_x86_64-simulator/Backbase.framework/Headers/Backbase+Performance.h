//
//  Backbase+Performance.h
//  Backbase
//
//  Created by Backbase R&D B.V._ on 17/07/15.
//  Copyright (c) 2015 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASEPERFORMANCE_CLASS
#define BACKBASEPERFORMANCE_CLASS

@interface Backbase (Performance)

/**
 * Starts a performance event to be queued and wait for the end signal to measure the time spend in this operation.
 * @param operation The name of the operation that is starting. This exact same name has to be send to end this
 * operation.
 * @param objId Optional object that is requesting an action. If no object is associated with this action nil can be
 * sent.
 * @discussion It's possible to start this event performances from javascript widgets. In order to do so, send a pubsub
 * <code>gadgets.pubsub.publish("bb.performance.start", {"operation":"operation", "id": "objId"})</code>
 * As well as in this implementation, operation is mandatory and the id is optional.
 */
+ (void)startPerformanceEvent:(NSString* _Nonnull)operation withObjectId:(NSString* _Nullable)objId;

/**
 * Starts a performance event to be queued and wait for the end signal to measure the time spend in this operation.
 * @param operation The name of the operation that is starting. This exact same name has to be send to end this
 * operation.
 * @param payload Optional dictionary with any parameters considered relevant for this event.
 * @param objId Optional object that is requesting an action. If no object is associated with this action nil can be
 * sent.
 * @discussion It's possible to start this event performances from javascript widgets. In order to do so, send a pubsub
 * <code>gadgets.pubsub.publish("bb.performance.start", {"operation":"operation", "id": "objId", "payload":
 * {"key":"value"}})</code>
 * As well as in this implementation, operation is mandatory and the id is optional.
 */
+ (void)startPerformanceEvent:(NSString* _Nonnull)operation
                      payload:(NSDictionary* _Nullable)payload
                 withObjectId:(NSString* _Nullable)objId;

/**
 * Ends a performance event that has been queued with a performanceStartEvent call.
 * @param operation The name of the operation that was started.
 * @discussion It's possible to end a performances event from javascript widgets. In order to do so, send a pubsub
 * <code>gadgets.pubsub.publish("bb.performance.end", {"operation":"operation"})</code>
 * As well as in this implementation, operation is mandatory.
 * After this call, a pubsub event named <i>bb.performance</i> will be publish on the <i>metrics</i> channel.
 * Subscribing to this channel and event, it's possible to get access to all performance events and do some processing
 * if necessary or send them to an analytics platform as Google Analytics or Crashlytics.
 */
+ (void)endPerformanceEvent:(NSString* _Nonnull)operation;
@end

#endif
