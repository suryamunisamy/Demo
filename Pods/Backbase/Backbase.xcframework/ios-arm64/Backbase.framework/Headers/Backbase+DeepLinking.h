//
//  Backbase+DeepLinking.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 06/06/2017.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASEDEEPLINKING_CLASS
#define BACKBASEDEEPLINKING_CLASS

@interface Backbase (DeepLinking)

/**
 * Allows to route a deep link to the right page in the app. 
 * The URL must be registered in the Info.plist under the URL schemes.
 * @discussion Given a URL with the shape scheme://path?query_string
 * A navigation event will be triggered using:
 * The path, as the event name.
 * The query_string, turned into a dictionary and passed as payload.
 * The [Backbase currentModel].app as source of the request, this will force the system to return the ROOT relationship
 * when the event gets resolved.
 * @param url The URL to route through the app.
 * @param error If an error occurs, upon return contains an NSError object that describes the problem.
 * @return YES, if the event can be route. NO if there is no model or the event is not registered in any destination.
 */
+ (BOOL)routeUsingURL:(NSURL* _Nonnull)url error:(NSError* _Nullable* _Nullable)error NS_SWIFT_NAME(route(toURL:));
@end

#endif
