//
//  Backbase+Content.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 06/07/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASECONTENT_CLASS
#define BACKBASECONTENT_CLASS

@interface Backbase (Content)

/**
 * Retrieves the content from the given path on the repository. The result is returned asynchronously
 * on the completionHandler. The BBContentItem will be initialized with path, and bytes.
 * @param path              Path to the content to be retrieved
 * @param repository        Repository id to search the content in
 * @param completionHandler A completion handler to process the result of the request. If there is any error during
 * the retrieval, the error object will contain the details of the error and the content object will be nil. Otherwise,
 * the content object will be initialized and the error will be nil.
 */
+ (void)contentByPath:(NSString* _Nonnull)path
           repository:(NSString* _Nonnull)repository
    completionHandler:(BBContentCallback _Nullable)completionHandler;

/**
 * Retrieves the content from the given content reference on the repository. The result is returned
 * asynchronously on the completionHandler. The BBContentItem will be initialized with the identifier, and
 * bytes.
 * @discussion The content reference is usually found on the Renderable items that represent a widget, under a
 * property called contentRef. This is the value that should be passed to this function as a parameter. If the value
 * of the preference is nil or something that does not resemble a content reference an error will be sent on the
 * completion handler.
 * @param reference         Content reference, usually on a contentRef preference.
 * @param completionHandler A completion handler to process the result of the request. If there is any error during
 * the retrieval, the error object will contain the details of the error and the content object will be nil. Otherwise,
 * the content object will be initialized and the error will be nil.
 */
+ (void)contentByReference:(NSString* _Nonnull)reference
         completionHandler:(BBContentCallback _Nullable)completionHandler;
@end

#endif
