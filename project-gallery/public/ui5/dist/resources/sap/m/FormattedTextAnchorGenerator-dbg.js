/*!
 * OpenUI5
 * (c) Copyright 2025 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */

/**
 * <code>FormattedText</code> helper.
 * This class handles the <code>AnchorGeneration</code> for the <code>FormattedText</code> control.
 */

sap.ui.define([
	"sap/ui/base/Object",
	"sap/m/library",
	"sap/base/security/URLListValidator"
], function(BaseObject, library, URLListValidator) {
	"use strict";

	// shortcut for sap.m.LinkConversion
	var LinkConversion = library.LinkConversion;

	var AnchorGenerator = BaseObject.extend("sap.m.FormattedTextAnchorGenerator", {
		getInterface: function() {
			return this; // no facade
		}
	});

	var LINK_SEARCH_PATTERN = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;()$]*[-A-Z0-9+&@#\/%=~_|])/gim;
	var WWW_DETECTION_PATTERN = /(www\.[^\s><]+(\b|$))/gim;
	var WWW_DETECTED_LINKS_PREFIX = "//";
	var DETECT_HTML_TAGS = /<(?:"[^"]*"['"]*|'[^']*'['"]*|[^'">])+(?!\/\s\*)>/gim;
	var EXISTING_ANCHOR_TAGS = /<a[^>]*>([^<]+)<\/a>/gim;
	var ENTITIES_TO_SKIP = [DETECT_HTML_TAGS, EXISTING_ANCHOR_TAGS];

	/**
	 * Generates anchors based on the provided configuration.
	 * @param {string} sText The text to be processed
	 * @param {sap.m.LinkConversion} sLinkConversionStrategy The link conversion strategy
	 * @param {string} sTarget The target attribute of the newly created anchors
	 * @static
	 * @public
	 * @returns {string} The resulting text after the anchor generation
	 */
	AnchorGenerator.generateAnchors = function (sText, sLinkConversionStrategy, sTarget) {
		if (sLinkConversionStrategy === LinkConversion.ProtocolOnly) {
			sText = AnchorGenerator._createAnchors(sText, LINK_SEARCH_PATTERN, sTarget);
		}

		if (sLinkConversionStrategy === LinkConversion.All) {
			sText = AnchorGenerator._createAnchors(sText, LINK_SEARCH_PATTERN, sTarget);
			sText = AnchorGenerator._createAnchors(sText, WWW_DETECTION_PATTERN, sTarget, WWW_DETECTED_LINKS_PREFIX);
		}

		return sText;
	};

	/**
	 * Creates a positioning object from a starting point and length.
	 * @param {number} iIndex
	 * @param {number} iLength
	 * @returns {{iStartPos: (number), iEndPos: (number)}}
	 * @private
	 */
	AnchorGenerator._createPositionObject = function (iIndex, iLength) {
		return {iStartPos: iIndex, iEndPos: iIndex + iLength};
	};

	/**
	 * Checks if the second object is nested inside the first one.
	 * @param {object} oFirst
	 * @param {object} oSecond
	 * @returns {boolean}
	 * @private
	 */
	AnchorGenerator._isNested = function (oFirst, oSecond) {
		return oFirst.iStartPos < oSecond.iStartPos && oFirst.iEndPos > oSecond.iEndPos;
	};

	/**
	 * Checks if any of the excluded positions coincide with the newly discovered link that's about to be created.
	 * @param {Array<Object>} aExcludedPositions
	 * @param {object} oCandidateAnchor
	 * @returns {*}
	 * @private
	 */
	AnchorGenerator._isAllowed = function (aExcludedPositions, oCandidateAnchor) {
		return aExcludedPositions.some(function (oExcludedPosition) {
			return AnchorGenerator._isNested(oExcludedPosition, oCandidateAnchor);
		});
	};

	/**
	 * Checks if the necessary preconditions for creating an anchor are met.
	 * @param {string} sUrlCandidate
	 * @param {object} oCandidatePosition
	 * @param {Array<Object>} aExcludedPositions
	 * @returns {boolean}
	 * @private
	 */
	AnchorGenerator._shouldBeProcessed = function (sUrlCandidate, oCandidatePosition, aExcludedPositions) {
		return URLListValidator.validate(sUrlCandidate) && !AnchorGenerator._isAllowed(aExcludedPositions, oCandidatePosition);
	};

	/**
	 * Scans for entities that shouldn't be processed (should be excluded).
	 * @param {regexp} rSearchPattern
	 * @param {string} sText
	 * @returns {Array<Object>}
	 * @private
	 */
	AnchorGenerator._scanForEntitiesToSkip = function (rSearchPattern, sText) {
		var aExistingAnchors = [],
			aCurrentMatch;

		while ((aCurrentMatch = rSearchPattern.exec(sText)) !== null) {
			aExistingAnchors.push(AnchorGenerator._createPositionObject(aCurrentMatch.index, aCurrentMatch[0].length));
		}

		return aExistingAnchors;
	};

	/**
	 * Retrieves the excluded entities in the text.
	 * @param {string} sText
	 * @returns {Array.<{iStartPos: (number), iEndPos: (number)}>}
	 * @private
	 */
	AnchorGenerator._getEntitiesToSkipWhileSearchingForLinks = function (sText) {
		return ENTITIES_TO_SKIP
			.map(function (sSearchPattern) {
				return AnchorGenerator._scanForEntitiesToSkip(sSearchPattern, sText);
			})
			.reduce(function (a, b) {
				return a.concat(b);
			});
	};

	/**
	 * Creates anchors from the discovered links and the supplied pattern.
	 * @param {string} sText
	 * @param {regex} rPattern
	 * @param {string} sTarget
	 * @param {string} sPrefix
	 * @returns {string}
	 * @private
	 */
	AnchorGenerator._createAnchors = function (sText, rPattern, sTarget, sPrefix) {
		var aExistingAnchors = AnchorGenerator._getEntitiesToSkipWhileSearchingForLinks(sText),
			fnCreateAnchor;

		sPrefix = sPrefix || '';

		fnCreateAnchor = function (sPotentialLink) {
			var oCandidatePosition = AnchorGenerator._createPositionObject(arguments[3], sPotentialLink.length);

			if (!AnchorGenerator._shouldBeProcessed(sPotentialLink, oCandidatePosition, aExistingAnchors)) {
				return sPotentialLink;
			}

			return "<a href=\"" + sPrefix + sPotentialLink + "\" target=\"" + sTarget + "\">" + sPotentialLink + "</a>";

		};

		return sText.replace(rPattern, fnCreateAnchor);
	};

	return AnchorGenerator;
});