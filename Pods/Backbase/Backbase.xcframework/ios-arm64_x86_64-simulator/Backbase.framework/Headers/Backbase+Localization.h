//
//  Backbase+Localization.h
//  Backbase
//
//  Created by Backbase R&D B.V. on 11/10/16.
//  Copyright © 2016 Backbase R&D B.V. All rights reserved.
//

#import <Backbase/Backbase.h>

#ifndef BACKBASELOCALIZATION_CLASS
#define BACKBASELOCALIZATION_CLASS

@interface Backbase (Localization)

/**
 * Gets the currently set accepted language, if no language has been set, it returns the preferred locale language of
 * the device.
 *
 * @return Language code as ISO-639-1 string
 */
+ (NSString* _Nonnull)acceptedLanguage;

/**
 * Sets the currently accepted language. The language locale has to be in ISO-639-1 code.
 *
 * @param locale Language code as ISO-639-1 string.
 * @return YES if the locale was set. NO if the locale was rejected for not being complaint with the ISO-639-1 standard.
 */
+ (BOOL)setAcceptedLanguage:(NSString* _Nonnull)locale;
@end

#endif
