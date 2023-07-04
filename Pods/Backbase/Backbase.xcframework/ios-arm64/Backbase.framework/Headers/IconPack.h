//
//  IconPack.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 01/06/15.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

/**
 * IconPack protocol.
 * Objects conforming this protocol know how to generate or retrieve the different icon states.
 * Implementations of this protocol could read files or generate UIImage's on the fly for different states.
 */
DEPRECATED_MSG_ATTRIBUTE("IconPack support will be removed in the future")
@protocol IconPack <NSObject>

/// Gets the icon pack's name
- (NSString* _Nullable)iconPackName;

/// Gets the UIImage for the icon in normal state.
- (UIImage* _Nullable)normal;

/// Gets the UIImage for the icon in active/highlighted state.
- (UIImage* _Nullable)active;

/// Gets the UIImage for the icon in pressed state.
- (UIImage* _Nullable)pressed;

/// Gets the UIImage for the icon in disabled state.
- (UIImage* _Nullable)disabled;

@end
