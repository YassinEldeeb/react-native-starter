import React, { FC } from 'react'
import {
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native'
import { useStoreActions, useStoreState } from '../@types/typedHooks'
import { MyText } from '../components/MyText'
import { PaintIcon } from '../components/icons/Paint'
import { themes } from '../config/themes'
import { HomeTabsParamList } from '../@types/StackParamList'
import { HomeNavProps } from '../@types/NavProps'

const marginRightBetweenBoxes = 7
const themeBoxSize =
  (Dimensions.get('window').width - 40 / 0.3 - marginRightBetweenBoxes * 3) / 4

const SettingsScreen: FC<HomeNavProps<'Settings'>> = ({
  navigation,
  route,
}) => {
  const colors = useStoreState((state) => state.theme)
  const changeTheme = useStoreActions((actions) => actions.changeTheme)
  const saveTheme = useStoreActions((actions) => actions.saveTheme)

  const SelectTheme = ({ colors }: { colors: any }) => {
    return (
      <View style={styles.themesParent}>
        {themes.map((types) => {
          return (
            <View style={styles.themeType} key={types.type}>
              <MyText size='md'>{types.type}</MyText>
              <View style={styles.colorsContainer}>
                {types.colors.map((theme, index) => {
                  const color: themes = Object.keys(theme)[0] as any
                  const selectedTheme = (theme as any)[color] === colors.primary

                  return (
                    <TouchableOpacity
                      onPress={async () => {
                        changeTheme(color)
                        await saveTheme(theme)
                      }}
                      key={color}
                      activeOpacity={colors.activeOpacity}
                      style={[
                        styles.themeBox,
                        {
                          backgroundColor: (theme as any)[color],
                          borderColor: colors.white,
                          borderWidth: selectedTheme ? 2 : 0,
                          marginRight:
                            types.colors.length - 1 !== index
                              ? marginRightBetweenBoxes
                              : 0,
                        },
                      ]}
                    />
                  )
                })}
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerStyle={{
        paddingVertical: 25,
        paddingHorizontal: 20,
      }}
    >
      <View style={[styles.colorsContainer, { alignItems: 'center' }]}>
        <PaintIcon size={27} />
        <MyText customStyles={{ marginLeft: 6 }} size='lg'>
          App Theme
        </MyText>
      </View>
      <SelectTheme colors={colors} />
    </ScrollView>
  )
}

export default SettingsScreen

const styles = StyleSheet.create({
  themeBox: {
    width: themeBoxSize,
    height: themeBoxSize,
    borderRadius: 7,
    marginBottom: marginRightBetweenBoxes,
  },
  themesParent: {
    paddingTop: 10,
  },
  themeType: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  colorsContainer: {
    flexDirection: 'row',
  },
})