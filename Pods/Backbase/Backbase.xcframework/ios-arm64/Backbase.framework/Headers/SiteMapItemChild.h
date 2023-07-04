//
//  SiteMapItemChild.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 02/10/15.
//  Copyright (c) 2015 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/BBConstants.h>

/// SiteMapItemChild protocol. Conforming object represents a SiteMapItem with all internal structure.
@protocol SiteMapItemChild <NSObject>
@required

/// Returns the id of the item.
- (NSString* _Nonnull)itemRef;

/// Returns the name of the item.
- (NSString* _Nullable)title;

/// Returns the path of the item.
- (NSString* _Nullable)href;

/// Returns the type of the item. See BBItemType for more details.
- (BBItemType)itemType;

/// Returns an array of objects conforming the SiteMapItemChild, allows full traversal.
- (NSArray<NSObject<SiteMapItemChild>*>* _Nullable)children;
@end
