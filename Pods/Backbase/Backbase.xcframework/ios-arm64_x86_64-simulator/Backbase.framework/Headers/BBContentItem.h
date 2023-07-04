//
//  BBContentItem.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 06/07/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>

#ifndef BBCONTENTITEM_CLASS
#define BBCONTENTITEM_CLASS

/**
 * Content container. It holds information about the content downloaded: origin, type, and requested method (by path
 * or id). It also provides handy methods to retrieve the content on specific formats depending on the developer's
 * needs. The raw data is always available, but with the information on the type property, it's possible to receive
 * a more meaningful representation of the object by invoking the respective property. If the content stream cannot
 * be turned into the property called, it will return nil instead, denoting that was a problem during the conversion.
 */
@interface BBContentItem : NSObject

/// Gets the content on its image representation
@property (strong, nonatomic, readonly) UIImage* _Nullable image;

/// Gets the content on its text representation (UTF-8 encoded)
@property (strong, nonatomic, readonly) NSString* _Nullable text;

/// Gets the content on its raw form.
@property (strong, nonatomic, readonly) NSData* _Nonnull bytes;

/// Gets the content on its JSON representation.
@property (strong, nonatomic, readonly) NSDictionary<NSString*, NSObject*>* _Nullable JSON;

/// Gets the repository from where the content was requested
@property (strong, nonatomic, readonly) NSString* _Nonnull repository;

/// Gets the path of the content if it was requested by path
@property (strong, nonatomic, readonly) NSString* _Nullable path;

/// Gets the identifier of the content if it was requested by identifier
@property (strong, nonatomic, readonly) NSString* _Nullable identifier;
@end

/// Completion handler signature
typedef void (^BBContentCallback)(BBContentItem* _Nullable content, NSError* _Nullable error);

#endif
