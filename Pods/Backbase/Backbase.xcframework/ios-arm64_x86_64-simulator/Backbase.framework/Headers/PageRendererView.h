//
//  PageRendererView.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 13/03/17.
//  Copyright © 2017 Backbase R&D B.V. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <Backbase/Backbase.h>

#ifndef PAGERENDERERVIEW_PROTOCOL
#define PAGERENDERERVIEW_PROTOCOL

/**
 * Conforming object will be notified when views need to be layout in the page.
 */
@protocol PageRendererView <NativeView>

/**
 * Adds a view for layout in the page. The conforming object needs to decide how/where to place the given child view
 * based on information of the item.
 * @param child View that needs to be placed in the Page.
 * @param item Renderable item that created the child.
 */
- (void)addView:(UIView* _Nonnull)child item:(NSObject<Renderable>* _Nonnull)item;
@end

#endif
